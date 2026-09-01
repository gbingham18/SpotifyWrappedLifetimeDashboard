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

  private

  def set_import
    @import = Import.find(params[:import_id])
  end
end
