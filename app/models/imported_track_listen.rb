# == Schema Information
#
# Table name: imported_track_listens
#
#  id                :integer          not null, primary key
#  track_name        :string
#  artist_name       :string
#  album_name        :string
#  spotify_track_uri :string
#  time_stamp        :datetime
#  time_played       :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  import_id         :integer          not null
#

# typed: true

class ImportedTrackListen < ApplicationRecord
  belongs_to :import

  def self.most_listened(group_by_fields, row_limit, import_id, start_date, end_date)
    group_by_fields = Array(group_by_fields)

    if (group_by_fields - column_names).empty?
      self.where(import_id: import_id, time_stamp: start_date...end_date)
          .group(*group_by_fields)
          .order(Arel.sql("COUNT(*) DESC"))
          .limit(row_limit)
          .pluck(*group_by_fields, Arel.sql("COUNT(*)"))
    else
      []
    end
  end
end
