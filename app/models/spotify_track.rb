# == Schema Information
#
# Table name: tracks
#
#  id            :integer          not null, primary key
#  name          :string
#  spotify_id    :string
#  thumbnail_url :string
#  artist_spotify_id  :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

# typed: strict

class SpotifyTrack < ApplicationRecord
end
