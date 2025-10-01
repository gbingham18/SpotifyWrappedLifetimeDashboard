class RenameArtistToSpotifyArtist < ActiveRecord::Migration[8.0]
  def change
    rename_table :artists, :spotify_artists
  end
end
