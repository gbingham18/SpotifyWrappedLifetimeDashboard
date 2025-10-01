# typed: false
class AddImportReferenceToTrackListens < ActiveRecord::Migration[8.0]
  def change
    add_reference :track_listens, :import, null: false, foreign_key: true
  end
end
