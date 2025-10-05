module SpotifyHelper
  def extract_track_id(spotify_uri)
    return nil unless spotify_uri.is_a?(String) && spotify_uri.start_with?("spotify:track:")
    spotify_uri.split(":").last
  end
end
