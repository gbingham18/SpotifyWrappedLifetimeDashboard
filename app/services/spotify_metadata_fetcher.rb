class SpotifyMetadataFetcher
  def self.fetch_artist(artist_id)
    spotify_artist = SpotifyArtist.find_or_initialize_by(spotify_id: artist_id)
    return spotify_artist if spotify_artist.thumbnail_url.present?

    client = SpotifyApi::Client.new
    spotify_api_response_artist = client.get_artist(artist_id)

    if spotify_api_response_artist
      spotify_artist.name = spotify_api_response_artist.name
      spotify_artist.thumbnail_url = spotify_api_response_artist.images.min_by { |img| img.height }.url rescue nil
      spotify_artist.save
    end

    spotify_artist
  end

  def self.fetch_track(track_id)
    spotify_track = SpotifyTrack.find_or_initialize_by(spotify_id: track_id)
    return spotify_track if spotify_track.thumbnail_url.present?

    client = SpotifyApi::Client.new
    spotify_api_response_track = client.get_track(track_id)

    if spotify_api_response_track
      album_api_info = spotify_api_response_track.album
      artist_api_info  = spotify_api_response_track.artists.first
      spotify_track.name = spotify_api_response_track.name
      spotify_track.thumbnail_url = album_api_info.images.min_by { |img| img.height }.url rescue nil
      spotify_track.artist_name = artist_api_info.name
      spotify_track.artist_spotify_id = artist_api_info.id
      spotify_track.save
    end

    spotify_track
  end
end
