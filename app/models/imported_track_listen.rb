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

  scope :in_range, ->(range) { where(time_stamp: range) }
  scope :by_artist, ->(name) { where(artist_name: name) }
  scope :with_track_uri, -> { where.not(spotify_track_uri: nil) }

  # Composes with any scope: import.imported_track_listens.in_range(year).most_listened_by(:artist_name)
  def self.most_listened_by(*columns, limit: 5)
    group(*columns)
      .order(Arel.sql("COUNT(*) DESC"))
      .limit(limit)
      .pluck(*columns, Arel.sql("COUNT(*)"))
  end

  def spotify_track_id
    SpotifyTrack.id_from_uri(spotify_track_uri)
  end
end
