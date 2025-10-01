# == Schema Information
#
# Table name: imports
#
#  id          :integer          not null, primary key
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  file_size   :integer
#  file_name   :string
#  file_format :string
#

# typed: false

class Import < ApplicationRecord
  has_many :imported_track_listens
  has_one_attached :file, dependent: :destroy

  validates :file, presence: true
  validate :validate_zip_file

  after_initialize do
    self.progress ||= 0
  end

  def set_metadata
    return unless file.attached?

    self.file_size = file.blob.byte_size
    self.file_name = file.filename.to_s
    self.file_format = file.content_type
  end

  private

  def validate_zip_file
    if file.attached? && file.content_type != "application/zip"
      errors.add(:file, "must be a ZIP file")
    end
  end
end
