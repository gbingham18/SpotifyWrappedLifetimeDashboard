class AddAvailableYearsToImports < ActiveRecord::Migration[8.0]
  def change
    add_column :imports, :available_years, :string
  end
end
