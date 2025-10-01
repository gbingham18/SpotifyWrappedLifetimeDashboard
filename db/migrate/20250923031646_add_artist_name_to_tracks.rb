class AddArtistNameToTracks < ActiveRecord::Migration[8.0]
  def change
    add_column :tracks, :artist_name, :string
  end
end
