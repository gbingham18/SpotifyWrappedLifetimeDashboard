class SpotifyController < ApplicationController
  include SpotifyHelper

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
    spotify_track = SpotifyMetadataFetcher.fetch_track(spotify_track_id)
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

    unless imported_track_listen_record
      render json: { error: "No track found" }, status: :not_found and return
    end

    spotify_track_id = extract_track_id(imported_track_listen_record.spotify_track_uri)
    spotify_track = SpotifyMetadataFetcher.fetch_track(spotify_track_id)

    render json: {
      name: spotify_track.name,
      thumbnail_url: spotify_track.thumbnail_url,
      artist_spotify_id: spotify_track.artist_spotify_id
    }
  end
end
