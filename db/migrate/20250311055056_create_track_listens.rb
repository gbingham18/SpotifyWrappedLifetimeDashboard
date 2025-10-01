# typed: true
class CreateTrackListens < ActiveRecord::Migration[8.0]
  def change
    create_table :track_listens do |t|
      t.string :track_name
      t.string :artist_name
      t.string :album_name
      t.string :spotify_track_uri
      t.datetime :time_stamp
      t.integer :time_played

      t.timestamps
    end
  end
end
