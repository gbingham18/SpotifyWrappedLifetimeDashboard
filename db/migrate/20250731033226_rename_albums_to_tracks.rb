# typed: false
class RenameAlbumsToTracks < ActiveRecord::Migration[8.0]
  def change
    rename_table :albums, :tracks
  end
end
