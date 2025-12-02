class SummariesController < ApplicationController
  include SpotifyHelper

  before_action :set_import

  def show
    selected_year = params[:year].presence || @import.most_recent_year
    start_of_year = DateTime.new(selected_year.to_i, 1, 1)
    end_of_year = start_of_year.end_of_year
    @selected_year = selected_year.to_i
    @top_tracks = ImportedTrackListen.most_listened([ "track_name", "spotify_track_uri" ], 5, @import.id, start_of_year, end_of_year)
    @top_artists = ImportedTrackListen.most_listened([ "artist_name" ], 5, @import.id, start_of_year, end_of_year)

    year_listens = @import.imported_track_listens.where(time_stamp: start_of_year..end_of_year)
    @total_streams = year_listens.count
    @total_streaming_time = year_listens.sum(:time_played)
    @total_artists = year_listens.distinct.count(:artist_name)
    @total_tracks = year_listens.distinct.count(:track_name)

    @track_images = {}
    @artist_images = {}

    @top_tracks.each do |top_track|
      spotify_track_id = extract_track_id(top_track[1])
      spotify_track_record = SpotifyMetadataFetcher.fetch_track(spotify_track_id)
      @track_images[top_track[0]] = spotify_track_record.thumbnail_url
    end

    # Get one representative track for each top artist
    # Needed for resolving the artist spotify id
    @top_artists.each do |top_artist|
      representative_imported_track_listen = ImportedTrackListen
        .where(artist_name: top_artist[0], import_id: @import.id)
        .where(time_stamp: start_of_year..end_of_year)
        .where.not(spotify_track_uri: nil)
        .order("time_played DESC")
        .first

      next unless representative_imported_track_listen

      representative_imported_track_listen_spotify_id = extract_track_id(representative_imported_track_listen.spotify_track_uri)
      representative_spotify_track = SpotifyMetadataFetcher.fetch_track(representative_imported_track_listen_spotify_id)
      spotify_artist = SpotifyMetadataFetcher.fetch_artist(representative_spotify_track.artist_spotify_id)
      @artist_images[top_artist[0]] = spotify_artist.thumbnail_url
    end
  end

  def bar_chart_race
    race_type = params[:type]
    selected_year = params[:year].presence || Date.today.year

    unless %w[Artists Tracks].include?(race_type)
      render json: { error: "Invalid type" }, status: :bad_request and return
    end

    race_data = BarChartRaceDatum.find_by(
      import_id: @import.id,
      year: selected_year.to_i,
      race_type: race_type
    )

    if race_data
      render json: race_data.data
    else
      render json: { error: "No race data available for the selected year and type" }, status: :not_found
    end
  end

  def heatmap_data
    selected_year = params[:year].to_i
    name = params[:name]
    type = params[:type]

    unless %w[artist track].include?(type)
      render json: { error: "Invalid type" }, status: :bad_request and return
    end

    race_data = BarChartRaceDatum.find_by(
      import_id: @import.id,
      year: selected_year,
      race_type: type.capitalize.pluralize # "Artists" or "Tracks"
    )

    unless race_data
      render json: { error: "No data found for this year and type" }, status: :not_found and return
    end

    plays_per_day = {}

    race_data.data.each do |date, entities|
      count = entities[name]
      plays_per_day[date] = count if count.present? && count > 0
    end

    render json: plays_per_day
  end

  def tree_data
    selected_year = params[:year].to_i
    start_of_year = DateTime.new(selected_year, 1, 1)
    end_of_year = start_of_year.end_of_year

    year_listens = @import.imported_track_listens.where(time_stamp: start_of_year..end_of_year)
    total_listens = year_listens.count

    # Group by artist and track, ordered by count descending
    artist_data = year_listens.group(:artist_name).order("count_all DESC").count

    children = artist_data.map do |artist_name, artist_count|
      track_data = year_listens.where(artist_name: artist_name).group(:track_name).order("count_all DESC").count

      track_children = track_data.map do |track_name, track_count|
        { name: track_name, value: track_count }
      end

      { name: artist_name, value: artist_count, children: track_children }
    end

    tree = {
      name: "Total Streams",
      value: total_listens,
      children: children
    }

    render json: tree
  end

  def hourly_listening_data
    selected_year = params[:year].to_i
    timezone = params[:timezone].presence || "America/Los_Angeles"

    start_of_year = DateTime.new(selected_year, 1, 1)
    end_of_year = start_of_year.end_of_year

    year_listens = @import.imported_track_listens.where(time_stamp: start_of_year..end_of_year)

    hourly_data = Array.new(24, 0)

    year_listens.each do |listen|
      local_time = listen.time_stamp.in_time_zone(timezone)
      hour = local_time.hour
      hourly_data[hour] += 1
    end

    render json: hourly_data
  end

  def daily_listening_data
    selected_year = params[:year].to_i
    timezone = params[:timezone].presence || "America/Los_Angeles"

    start_of_year = DateTime.new(selected_year, 1, 1)
    end_of_year = start_of_year.end_of_year

    year_listens = @import.imported_track_listens.where(time_stamp: start_of_year..end_of_year)

    daily_data = Array.new(7, 0)

    year_listens.each do |listen|
      local_time = listen.time_stamp.in_time_zone(timezone)
      day_of_week = local_time.wday
      daily_data[day_of_week] += 1
    end

    render json: daily_data
  end

  def stream_graph_data
    selected_year = params[:year].to_i
    race_type = params[:type] || "Artists"

    unless %w[Artists Tracks].include?(race_type)
      render json: { error: "Invalid type" }, status: :bad_request and return
    end

    race_data = BarChartRaceDatum.find_by(
      import_id: @import.id,
      year: selected_year,
      race_type: race_type
    )

    unless race_data
      render json: { error: "No data found for this year and type" }, status: :not_found and return
    end

    render json: race_data.data
  end

  private

  def set_import
    @import = Import.find(params[:import_id])
  end
end
