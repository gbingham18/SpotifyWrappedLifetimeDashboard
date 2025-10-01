class RenameTrackToSpotifyTrack < ActiveRecord::Migration[7.0]
  def change
    rename_table :tracks, :spotify_tracks
  end
end
