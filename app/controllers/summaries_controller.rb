class SummariesController < ApplicationController
  before_action :set_import

  def show
    @selected_year = (params[:year].presence || @import.most_recent_year).to_i
    year_listens = @import.imported_track_listens.in_range(Time.utc(@selected_year).all_year)

    @top_tracks = year_listens.most_listened_by(:track_name, :spotify_track_uri)
    @top_artists = year_listens.most_listened_by(:artist_name)

    @total_streams = year_listens.count
    @total_streaming_time = year_listens.sum(:time_played)
    @total_artists = year_listens.distinct.count(:artist_name)
    @total_tracks = year_listens.distinct.count(:track_name)

    @track_images = @top_tracks.to_h do |track_name, uri, _plays|
      [ track_name, SpotifyTrack.fetch(SpotifyTrack.id_from_uri(uri)).thumbnail_url ]
    end

    @artist_images = @top_artists.to_h do |artist_name, _plays|
      [ artist_name, artist_thumbnail(year_listens, artist_name) ]
    end
  end

  private

  def set_import
    @import = Import.find(params[:import_id])
  end

  # The export carries no artist ids, so an artist's image is resolved
  # through their most-played track in the range.
  def artist_thumbnail(listens, artist_name)
    listen = listens.by_artist(artist_name).with_track_uri.order(time_played: :desc).first
    return nil unless listen

    track = SpotifyTrack.fetch(listen.spotify_track_id)
    SpotifyArtist.fetch(track.artist_spotify_id).thumbnail_url
  end
end
