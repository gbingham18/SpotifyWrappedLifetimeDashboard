class DropBarChartRaceDataAndIndexListens < ActiveRecord::Migration[8.0]
  def change
    # The bar chart race feature is retired; the replay endpoints now query
    # imported_track_listens directly.
    drop_table :bar_chart_race_data do |t|
      t.integer "import_id", null: false
      t.integer "year"
      t.string "race_type"
      t.jsonb "data", default: {}, null: false
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
      t.index [ "import_id" ], name: "index_bar_chart_race_data_on_import_id"
    end

    # Keep the replay GROUP BY queries index-backed.
    add_index :imported_track_listens, [ :import_id, :time_stamp ]
    add_index :imported_track_listens, [ :import_id, :artist_name ]
    add_index :imported_track_listens, [ :import_id, :track_name ]
  end
end
