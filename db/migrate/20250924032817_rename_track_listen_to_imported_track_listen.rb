class RenameTrackListenToImportedTrackListen < ActiveRecord::Migration[7.0]
  def change
    rename_table :track_listens, :imported_track_listens
  end
end
