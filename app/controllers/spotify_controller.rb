class SpotifyController < ApplicationController
  def artist_image
    artist_name = params[:name]

    unless artist_name.present?
      render json: { error: "Missing artist name" }, status: :bad_request and return
    end

    representative_imported_track_listen = ImportedTrackListen
      .where(artist_name: artist_name)
      .where.not(spotify_track_uri: nil)
      .order("time_played DESC")
      .first

    unless representative_imported_track_listen
      render json: { error: "No track found for artist" }, status: :not_found and return
    end

    spotify_track_id = extract_track_id(representative_imported_track_listen.spotify_track_uri)

    spotify_track = SpotifyTrack.find_or_initialize_by(spotify_id: spotify_track_id)

    if spotify_track.new_record?
      client = SpotifyApi::Client.new
      spotify_api_response_track = client.get_track(spotify_track_id)
      if spotify_api_response_track
        album_info = spotify_api_response_track.album
        artist_info = spotify_api_response_track.artists.first
        spotify_track.name = spotify_api_response_track.name
        spotify_track.thumbnail_url = album_info.images.min_by { |img| img.height }.url rescue nil
        spotify_track.artist_spotify_id = artist_info.id
        spotify_track.save
      end
    end

    spotify_artist = SpotifyMetadataFetcher.fetch_artist(spotify_track.artist_spotify_id)

    render json: {
      name: spotify_artist.name,
      thumbnail_url: spotify_artist.thumbnail_url,
      spotify_id: spotify_artist.spotify_id
    }
  end


  def track_image
    track_name = params[:name]

    unless track_name.present?
      render json: { error: "Missing track ID" }, status: :bad_request and return
    end

    imported_track_listen_record = ImportedTrackListen.where(track_name: track_name).first

    spotify_track_id = extract_track_id(imported_track_listen_record.spotify_track_uri)

    spotify_track = SpotifyMetadataFetcher.fetch_track(spotify_track_id)

    render json: {
      name: spotify_track.name,
      thumbnail_url: spotify_track.thumbnail_url,
      artist_spotify_id: spotify_track.artist_spotify_id
    }
  end

  private

  def extract_track_id(spotify_uri)
      return nil unless spotify_uri.is_a?(String) && spotify_uri.start_with?("spotify:track:")
      spotify_uri.split(":").last
  end
end
