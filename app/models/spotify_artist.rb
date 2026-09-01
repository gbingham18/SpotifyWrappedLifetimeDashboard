# == Schema Information
#
# Table name: spotify_artists
#
#  id            :integer          not null, primary key
#  name          :string
#  spotify_id    :string
#  thumbnail_url :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

# typed: true

class SpotifyArtist < ApplicationRecord
  # Returns the locally cached artist, hydrating it from the Spotify API on
  # first sight.
  def self.fetch(spotify_id, client: SpotifyApi::Client.new)
    artist = find_or_initialize_by(spotify_id: spotify_id)
    return artist if artist.thumbnail_url.present?

    api_artist = client.get_artist(spotify_id)
    artist.update(name: api_artist.name, thumbnail_url: api_artist.image_url)
    artist
  end
end
