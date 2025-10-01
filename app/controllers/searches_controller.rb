class SearchesController < ApplicationController
  before_action :set_import

  def entity_names
    type = params[:type]
    query = params[:q].to_s.strip.downcase

    unless %w[artist track].include?(type)
      render json: { error: "Invalid type" }, status: :bad_request and return
    end

    results = @import.imported_track_listens
      .where.not("#{type}_name": [ nil, "" ])
      .distinct
      .pluck("#{type}_name")
      .select { |name| name.downcase.include?(query) }
      .sort
      .first(20)

    render json: results
  end

  private

  def set_import
    @import = Import.find(params[:import_id])
  end
end
