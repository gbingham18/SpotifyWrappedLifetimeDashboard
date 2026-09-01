class SpotifyMetadataFetcher
  def initialize(client = nil)
    @client = client || SpotifyApi::Client.new
  end

  def fetch_artist(artist_id)
    spotify_artist = SpotifyArtist.find_or_initialize_by(spotify_id: artist_id)
    return spotify_artist if spotify_artist.thumbnail_url.present?

    artist = @client.get_artist(artist_id)
    spotify_artist.update(name: artist.name, thumbnail_url: artist.image_url)
    spotify_artist
  end

  def fetch_track(track_id)
    spotify_track = SpotifyTrack.find_or_initialize_by(spotify_id: track_id)
    return spotify_track if spotify_track.thumbnail_url.present?

    track = @client.get_track(track_id)
    spotify_track.update(
      name: track.name,
      thumbnail_url: track.image_url,
      artist_name: track.artist_name,
      artist_spotify_id: track.artist_id
    )
    spotify_track
  end

  def self.fetch_artist(artist_id)
    new.fetch_artist(artist_id)
  end

  def self.fetch_track(track_id)
    new.fetch_track(track_id)
  end
end
