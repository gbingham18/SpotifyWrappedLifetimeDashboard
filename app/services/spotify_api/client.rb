require "net/http"
require "json"

module SpotifyApi
  class Client
    BASE_URL = "https://api.spotify.com/v1"

    # Just the fields the app consumes — the full API payload stays a hash.
    Artist = Data.define(:id, :name, :image_url)
    Track = Data.define(:id, :name, :artist_id, :artist_name, :image_url)

    def initialize
      @access_token = SpotifyToken.fetch
    end

    def get_artist(artist_id)
      data = get("/artists/#{artist_id}")
      Artist.new(
        id: data["id"],
        name: data["name"],
        image_url: smallest_image_url(data["images"])
      )
    end

    def get_track(track_id)
      data = get("/tracks/#{track_id}")
      artist = data["artists"]&.first || {}
      Track.new(
        id: data["id"],
        name: data["name"],
        artist_id: artist["id"],
        artist_name: artist["name"],
        image_url: smallest_image_url(data.dig("album", "images"))
      )
    end

    private

    def smallest_image_url(images)
      images&.min_by { |image| image["height"] }&.fetch("url", nil)
    end

    def get(path)
      uri = URI("#{BASE_URL}#{path}")
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{@access_token}"

      http = Net::HTTP.new(uri.hostname, uri.port)
      http.use_ssl = true

      response = http.start do |http|
        http.request(request)
      end

      parsed = JSON.parse(response.body)

      if response.code.to_i >= 400
        raise Error, "Spotify API #{response.code}: #{parsed.dig('error', 'message') || 'unknown error'} (#{path})"
      end

      parsed
    end
  end
end
