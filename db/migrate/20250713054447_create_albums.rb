# typed: true

class CreateAlbums < ActiveRecord::Migration[8.0]
  def change
    create_table :albums do |t|
      t.string :name
      t.string :spotify_id
      t.string :thumbnail_url

      t.timestamps
    end
  end
end
