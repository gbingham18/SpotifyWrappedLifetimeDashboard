class ReplaysController < ApplicationController
  before_action :set_import

  TOP_ARTIST_COUNT = 8
  SESSION_GAP_MS = 30 * 60 * 1000

  # Timestamps are stored as naive UTC, so DATE() buckets by UTC day —
  # the same bucketing the importer used and the frontend assumes.
  DAY_SQL = Arel.sql("DATE(time_stamp)")
  COUNT_SQL = Arel.sql("COUNT(*)")
  MS_SQL = Arel.sql("SUM(time_played)")

  # One payload for everything the master timeline needs up front:
  # daily totals plus per-day series for the top artists, straight from
  # imported_track_listens. Fetched once — the brush never round-trips.
  def bootstrap
    scope = @import.imported_track_listens

    totals = {} # "YYYY-MM-DD" => [plays, ms]
    scope.group(DAY_SQL).pluck(DAY_SQL, COUNT_SQL, MS_SQL).each do |date, plays, ms|
      totals[date.to_s] = [ plays, ms.to_i ]
    end
    if totals.empty?
      render json: { error: "No listening data for this import" }, status: :not_found and return
    end

    top = scope.group(:artist_name)
      .order(Arel.sql("SUM(time_played) DESC"))
      .limit(TOP_ARTIST_COUNT)
      .pluck(:artist_name, COUNT_SQL, MS_SQL)

    series_by_artist = Hash.new { |h, k| h[k] = {} }
    scope.where(artist_name: top.map(&:first))
      .group(:artist_name, DAY_SQL)
      .pluck(:artist_name, DAY_SQL, COUNT_SQL, MS_SQL)
      .each { |name, date, plays, ms| series_by_artist[name][date.to_s] = [ plays, ms.to_i ] }

    dates = totals.keys.sort
    render json: {
      start: dates.first,
      end: dates.last,
      lifetime: {
        plays: totals.each_value.sum { |p, _| p },
        ms: totals.each_value.sum { |_, m| m },
        days: totals.size
      },
      totals: totals,
      top_artists: top.map do |name, plays, ms|
        { name: name, plays: plays, ms: ms.to_i, series: series_by_artist[name] }
      end
    }
  end

  # Daily series + lifetime stats for one entity (artist or track), for the
  # focused view.
  def entity_series
    type = params[:type]
    name = params[:name]
    unless %w[Artists Tracks].include?(type) && name.present?
      render json: { error: "Invalid type or name" }, status: :bad_request and return
    end

    column = type == "Artists" ? :artist_name : :track_name
    scope = @import.imported_track_listens.where(column => name)

    series = {} # "YYYY-MM-DD" => [plays, ms]
    scope.group(DAY_SQL).pluck(DAY_SQL, COUNT_SQL, MS_SQL).each do |date, plays, ms|
      series[date.to_s] = [ plays, ms.to_i ]
    end
    if series.empty?
      render json: { error: "No data for #{name}" }, status: :not_found and return
    end

    dates = series.keys.sort
    stats = {
      plays: series.each_value.sum { |p, _| p },
      ms: series.each_value.sum { |_, m| m },
      first_play: dates.first,
      last_play: dates.last
    }

    if type == "Artists"
      ranked = @import.imported_track_listens
        .group(:artist_name)
        .order(Arel.sql("SUM(time_played) DESC"))
        .pluck(:artist_name)
      stats[:rank] = ranked.index(name) + 1
      stats[:artist_count] = ranked.size
      stats[:per_year] = per_year_ranks(name)
    else
      stats[:artist] = scope.group(:artist_name).count.max_by { |_, c| c }&.first
    end

    render json: { series: series, stats: stats }
  end

  # Top artists/tracks for an arbitrary range (right-rail tiles).
  def range_summary
    from = parse_date(params[:from])
    to = parse_date(params[:to])
    unless from && to && from <= to
      render json: { error: "Invalid range" }, status: :bad_request and return
    end

    scope = @import.imported_track_listens.where(time_stamp: utc_range(from, to))
    scope = scope.where(artist_name: params[:artist]) if params[:artist].present?

    artists = scope.group(:artist_name)
      .pluck(:artist_name, COUNT_SQL, MS_SQL)
      .sort_by { |_, _, ms| -ms.to_i }
      .first(TOP_ARTIST_COUNT)
      .map { |name, plays, ms| { name: name, plays: plays, ms: ms.to_i } }

    tracks = scope.group(:track_name, :artist_name)
      .pluck(:track_name, :artist_name, COUNT_SQL, MS_SQL)
      .sort_by { |_, _, _, ms| -ms.to_i }
      .first(12)
      .map { |name, artist, plays, ms| { name: name, artist: artist, plays: plays, ms: ms.to_i } }

    render json: { top_artists: artists, top_tracks: tracks }
  end

  # One day's plays grouped into sessions (gap > 30 min starts a new one).
  # Session metadata Spotify exports (device, shuffle, skip reason) is not
  # persisted by the importer yet, so sessions carry only times and tracks.
  def day
    date = parse_date(params[:date])
    unless date
      render json: { error: "Invalid date" }, status: :bad_request and return
    end

    listens = @import.imported_track_listens
      .where(time_stamp: utc_range(date, date))
      .order(:time_stamp)
      .pluck(:track_name, :artist_name, :time_stamp, :time_played)

    sessions = []
    listens.each do |track, artist, ts, ms|
      ms = ms.to_i
      last = sessions.last
      if last.nil? || (ts.to_f * 1000 - last[:end_ms]) > SESSION_GAP_MS
        sessions << { start: ts.iso8601, end_ms: ts.to_f * 1000 + ms, ms: 0, tracks: [] }
        last = sessions.last
      end
      last[:tracks] << { name: track, artist: artist, at: ts.iso8601, ms: ms }
      last[:ms] += ms
      last[:end_ms] = [ last[:end_ms], ts.to_f * 1000 + ms ].max
    end
    sessions.each do |s|
      s[:end] = Time.at(s.delete(:end_ms) / 1000.0).utc.iso8601
    end

    render json: { sessions: sessions }
  end

  private

  def set_import
    @import = Import.find(params[:import_id])
  end

  # Yearly totals + rank for one artist, computed over all artists per year
  # in a single window-function query.
  def per_year_ranks(artist_name)
    sql = ImportedTrackListen.sanitize_sql_array([ <<~SQL, @import.id, artist_name ])
      SELECT year, ms, plays, rank FROM (
        SELECT EXTRACT(YEAR FROM time_stamp)::int AS year,
               artist_name,
               SUM(time_played) AS ms,
               COUNT(*) AS plays,
               RANK() OVER (
                 PARTITION BY EXTRACT(YEAR FROM time_stamp)
                 ORDER BY SUM(time_played) DESC
               ) AS rank
        FROM imported_track_listens
        WHERE import_id = ?
        GROUP BY 1, 2
      ) ranked
      WHERE artist_name = ?
      ORDER BY year
    SQL

    ImportedTrackListen.connection.select_all(sql).map do |row|
      { year: row["year"], ms: row["ms"].to_i, plays: row["plays"], rank: row["rank"].to_i }
    end
  end

  def parse_date(value)
    Date.iso8601(value.to_s)
  rescue ArgumentError
    nil
  end

  # Day bucketing is by UTC date, so range queries use UTC day bounds.
  def utc_range(from, to)
    Time.utc(from.year, from.month, from.day)..Time.utc(to.year, to.month, to.day).end_of_day
  end
end
