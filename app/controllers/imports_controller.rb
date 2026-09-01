class ImportsController < ApplicationController
  def index
    @import = Import.new
  end

  def create
    @import = Import.new(import_params)

    if @import.save
      respond_to do |format|
        format.html { redirect_to import_summary_path(@import), notice: "ZIP file was successfully uploaded." }
        format.json { render json: { import_id: @import.id }, status: :created }
      end
    else
      respond_to do |format|
        format.html { render :index, status: :unprocessable_entity }
        format.json { render json: { errors: @import.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def status
    import = Import.find_by(id: params[:id])

    if import
      render json: { progress: import.progress }
    else
      render json: { error: "Import not found" }, status: :not_found
    end
  end

  private

  def import_params
    params.fetch(:import, {}).permit(:file)
  end
end
