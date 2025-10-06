# typed: false

class AddFileDetailsToImports < ActiveRecord::Migration[8.0]
  def change
    add_column :imports, :file_size, :integer
    add_column :imports, :file_name, :string
    add_column :imports, :file_format, :string
  end
end
