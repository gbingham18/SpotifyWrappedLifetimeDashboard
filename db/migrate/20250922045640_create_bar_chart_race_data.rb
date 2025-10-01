class CreateBarChartRaceData < ActiveRecord::Migration[8.0]
  def change
    create_table :bar_chart_race_data do |t|
      t.references :import, null: false, foreign_key: true
      t.integer :year
      t.string :race_type
      t.json :data

      t.timestamps
    end
  end
end
