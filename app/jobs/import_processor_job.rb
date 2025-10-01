class ImportProcessorJob < ApplicationJob
  queue_as :default

  def perform(import_id)
    import = Import.find(import_id)
    uploaded_file = import.file

    return unless uploaded_file.attached?

    begin
      import.file.open do |file|
        processor = ImportFileProcessor.new(file, import.id)
        processor.process
      end
    rescue => e
      Rails.logger.error("ImportProcessorJob failed: #{e.message}")
      import.update(progress: -1) # or some error state
    end
  end
end
