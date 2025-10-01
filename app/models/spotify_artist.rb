# == Schema Information
#
# Table name: artists
#
#  id            :integer          not null, primary key
#  name          :string
#  spotify_id    :string
#  thumbnail_url :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

# typed: strict

class SpotifyArtist < ApplicationRecord
end
