class ImportFileProcessor
  require "json"
  require "zip"

  def initialize(uploaded_zip_file, import_id)
    @uploaded_zip_file = uploaded_zip_file
    @import_id = import_id
    @import = Import.find(@import_id)
  end

  def process
    Zip::File.open(@uploaded_zip_file.path) do |zip_file|
      json_entries = zip_file.select do |entry|
        entry.name.end_with?(".json") &&
          !entry.name.start_with?("__MACOSX/") &&
          !File.basename(entry.name).start_with?("._")
      end
      json_entries.each_with_index do |entry, index|
        puts entry.name
        process_json_entry(entry, index, json_entries.size)
      end
    end

    update_progress(100)
  end

  private

  def process_json_entry(entry, json_index, total_json_files)
    json_data = JSON.parse(entry.get_input_stream.read)

    artist_data = Hash.new { |h, k| h[k] = Hash.new(0) }
    track_data  = Hash.new { |h, k| h[k] = Hash.new(0) }

    total_entries = json_data.size
    json_data.each_with_index do |data, index|
      timestamp = DateTime.parse(data["ts"])
      date_str  = timestamp.to_date.to_s

      track_name  = data["master_metadata_track_name"]
      artist_name = data["master_metadata_album_artist_name"]

      artist_data[date_str][artist_name] += 1 if artist_name.present?
      track_data[date_str][track_name]   += 1 if track_name.present?

      ImportedTrackListen.create!(
        track_name: track_name,
        artist_name: artist_name,
        album_name: data["master_metadata_album_album_name"],
        spotify_track_uri: data["spotify_track_uri"],
        time_stamp: timestamp,
        time_played: data["ms_played"],
        import_id: @import_id
      )

      if index % 10 == 0 || index == total_entries - 1
        current_progress = calculate_progress(json_index, total_json_files, index, total_entries)
        update_progress(current_progress)
      end
    end

    save_bar_chart_data(artist_data, track_data)
  rescue JSON::ParserError => e
    Rails.logger.error("Error parsing JSON: #{e.message}")
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error("Error saving model records: #{e.message}")
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

  def save_bar_chart_data(artist_data, track_data)
    selected_year = @import.imported_track_listens.minimum(:time_stamp)&.year || Date.today.year

    BarChartRaceDatum.create!(
      import: @import,
      year: selected_year,
      race_type: "Artists",
      data: artist_data
    )

    BarChartRaceDatum.create!(
      import: @import,
      year: selected_year,
      race_type: "Tracks",
      data: track_data
    )
  end
end
