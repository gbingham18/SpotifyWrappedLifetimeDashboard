# == Schema Information
#
# Table name: spotify_tracks
#
#  id                :integer          not null, primary key
#  name              :string
#  spotify_id        :string
#  thumbnail_url     :string
#  artist_spotify_id :string
#  artist_name       :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

# typed: true

class SpotifyTrack < ApplicationRecord
  URI_PREFIX = "spotify:track:"

  # Returns the locally cached track, hydrating it from the Spotify API on
  # first sight.
  def self.fetch(spotify_id, client: SpotifyApi::Client.new)
    track = find_or_initialize_by(spotify_id: spotify_id)
    return track if track.thumbnail_url.present?

    api_track = client.get_track(spotify_id)
    track.update(
      name: api_track.name,
      thumbnail_url: api_track.image_url,
      artist_name: api_track.artist_name,
      artist_spotify_id: api_track.artist_id
    )
    track
  end

  def self.id_from_uri(uri)
    return nil unless uri.is_a?(String) && uri.start_with?(URI_PREFIX)
    uri.delete_prefix(URI_PREFIX)
  end
end
