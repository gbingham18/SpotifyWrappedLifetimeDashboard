class ChangeDataColumnTypeToJsonbInBarChartRaceData < ActiveRecord::Migration[7.0]
  def change
    change_column :bar_chart_race_data, :data, :jsonb, using: 'data::jsonb', default: {}, null: false
  end
end
