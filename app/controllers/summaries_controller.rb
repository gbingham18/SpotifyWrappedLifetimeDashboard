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

    @track_images = {}
    @artist_images = {}

    @top_tracks.each do |top_track|
      spotify_track_id = extract_track_id(top_track[1])
      spotify_track_record = SpotifyMetadataFetcher.fetch_track(spotify_track_id)
      @track_images[top_track[0]] = spotify_track_record.thumbnail_url
    end

    # Get one representative track for each top artist
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
    type = params[:type] # "artist" or "track"

    unless %w[artist track].include?(type)
      render json: { error: "Invalid type" }, status: :bad_request and return
    end

    race_data = BarChartRaceDatum.find_by(
      import_id: @import.id,
      year: selected_year,
      race_type: type.capitalize.pluralize # => "Artists" or "Tracks"
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

  private

  def set_import
    @import = Import.find(params[:import_id])
  end
end
