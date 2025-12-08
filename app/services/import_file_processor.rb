class ImportFileProcessor
  require "json"
  require "zip"

  def initialize(uploaded_zip_file, import_id)
    @uploaded_zip_file = uploaded_zip_file
    @import_id = import_id
    @import = Import.find(@import_id)

    # 3-level nested hash: year → date → artist/track → count
    @artist_data_by_year = Hash.new do |h, year|
      h[year] = Hash.new { |h2, date| h2[date] = Hash.new(0) }
    end

    @track_data_by_year = Hash.new do |h, year|
      h[year] = Hash.new { |h2, date| h2[date] = Hash.new(0) }
    end
  end

  def process
    Zip::File.open(@uploaded_zip_file.path) do |zip_file|
      json_entries = zip_file.select do |entry|
        entry.name.end_with?(".json") &&
          !entry.name.start_with?("__MACOSX/") &&
          !File.basename(entry.name).start_with?("._")
      end

      json_entries.each_with_index do |entry, index|
        puts "Processing: #{entry.name}"
        process_json_entry(entry, index, json_entries.size)
      end
    end

    # Final write: after ALL entries processed
    save_bar_chart_data

    @import.populate_available_years
    update_progress(100)
  end

  private

  def process_json_entry(entry, json_index, total_json_files)
    json_data = JSON.parse(entry.get_input_stream.read)

    total_entries = json_data.size
    batch_size = [ total_entries / 10, 1000 ].min
    batch_size = 1 if batch_size <= 0

    records_to_insert = []

    json_data.each_with_index do |data, index|
      timestamp = DateTime.parse(data["ts"])
      year      = timestamp.year
      date_str  = timestamp.to_date.to_s

      track_name  = data["master_metadata_track_name"]
      artist_name = data["master_metadata_album_artist_name"]
      uri         = data["spotify_track_uri"]

      # Skip podcast episodes / missing data
      next if uri.blank? || !uri.start_with?("spotify:track:")
      next if track_name.blank? || artist_name.blank?

      # Only insert tracks with enough play time
      if data["ms_played"].to_i >= 30000
        # Aggregate per year → date → artist
        @artist_data_by_year[year][date_str][artist_name] += 1
        @track_data_by_year[year][date_str][track_name]   += 1
        records_to_insert << {
          track_name: track_name,
          artist_name: artist_name,
          album_name: data["master_metadata_album_album_name"],
          spotify_track_uri: uri,
          time_stamp: timestamp,
          time_played: data["ms_played"],
          import_id: @import_id,
          created_at: Time.current,
          updated_at: Time.current
        }
      end

      # Bulk insert when batch is full
      if records_to_insert.size >= batch_size
        ImportedTrackListen.insert_all(records_to_insert)
        records_to_insert.clear
      end

      # Progress updates
      if index % batch_size == 0 || index == total_entries - 1
        update_progress(calculate_progress(json_index, total_json_files, index, total_entries))
      end
    end

    # Insert any remaining rows
    ImportedTrackListen.insert_all(records_to_insert) if records_to_insert.any?

  rescue JSON::ParserError => e
    Rails.logger.error("Error parsing JSON: #{e.message}")
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error("Error saving model records: #{e.message}")
  end

  def save_bar_chart_data
    # One record per year per race type
    @artist_data_by_year.each do |year, date_hash|
      BarChartRaceDatum.create!(
        import: @import,
        year: year,
        race_type: "Artists",
        data: date_hash
      )
    end

    @track_data_by_year.each do |year, date_hash|
      BarChartRaceDatum.create!(
        import: @import,
        year: year,
        race_type: "Tracks",
        data: date_hash
      )
    end
  end

  def calculate_progress(json_index, total_json_files, entry_index, total_entries)
    file_progress = (entry_index + 1).to_f / total_entries
    overall_progress = ((json_index + file_progress) / total_json_files) * 100
    overall_progress.round
  end

  def update_progress(percent)
    return if percent <= @import.progress.to_i
    @import.update(progress: percent)
  rescue => e
    Rails.logger.error("Failed to update progress: #{e.message}")
  end
end
