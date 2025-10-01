class AddArtistSpotifyIdToTracks < ActiveRecord::Migration[8.0]
  def change
    add_column :tracks, :artist_spotify_id, :string
  end
end
