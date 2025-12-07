require "net/http"
require "json"

module SpotifyApi
  class Client
    BASE_URL = "https://api.spotify.com/v1"

    def initialize
      @access_token = SpotifyToken.fetch
    end

    def get_artist(artist_id)
      response = get("/artists/#{artist_id}")
      SpotifyApiArtist.new(response)
    end

    def get_track(track_id)
      response = get("/tracks/#{track_id}")
      SpotifyApiTrack.new(response)
    end

    private

    def get(path)
      uri = URI("#{BASE_URL}#{path}")
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{@access_token}"

      http = Net::HTTP.new(uri.hostname, uri.port)
      http.use_ssl = true
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?

      response = http.start do |http|
        http.request(request)
      end

      parsed = JSON.parse(response.body)

      raise "Spotify API Error: #{parsed['error']&.dig('message') || 'Unknown error'}, request_path: #{path}" if response.code.to_i >= 400

      parsed
    end
  end
end
