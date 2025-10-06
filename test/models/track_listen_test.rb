# == Schema Information
#
# Table name: track_listens
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

# typed: strict

require "test_helper"

class TrackListenTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
