class RemoveAvailableYearsFromImports < ActiveRecord::Migration[8.0]
  def change
    # available_years is now derived from imported_track_listens with an
    # indexed DISTINCT instead of being cached as a CSV string.
    remove_column :imports, :available_years, :string
  end
end
