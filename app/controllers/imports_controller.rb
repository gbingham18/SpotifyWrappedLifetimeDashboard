class ImportsController < ApplicationController
    protect_from_forgery with: :null_session
    def new
        @import = Import.new
    end

    def import
        uploaded_file = params[:file]

        if uploaded_file.nil? || uploaded_file.content_type != "application/zip"
            respond_to do |format|
            format.html do
                flash[:error] = "No file uploaded."
                redirect_to import_import_path
            end
            format.json do
                render json: { error: "Invalid file" }, status: :unprocessable_entity
            end
            end
            return
        end

        @import = Import.create
        @import.file.attach(uploaded_file)
        @import.set_metadata

        if @import.save
            ImportProcessorJob.perform_later(@import.id)

            respond_to do |format|
                format.html { redirect_to import_summary_path(@import), notice: "ZIP file was successfully uploaded." }
                format.json { render json: { import_id: @import.id }, status: :ok }
            end
        else
            respond_to do |format|
                format.html { render :new }
                format.json { render json: { error: "Failed to save import" }, status: :unprocessable_entity }
            end
        end
    end

    def status
        import = Import.find_by(id: params[:id])

        if import.nil?
            render json: { error: "Import not found" }, status: :not_found
        else
            render json: { progress: import.progress }
        end
    end

    private

    def import_params
        params.require(:import).permit(:file)
    end
end
