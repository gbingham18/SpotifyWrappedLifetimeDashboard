class AddProgressToImports < ActiveRecord::Migration[8.0]
  def change
    add_column :imports, :progress, :integer
  end
end
