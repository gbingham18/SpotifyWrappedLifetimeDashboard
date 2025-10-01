module SpotifyApi
  class SpotifyApiArtist
    attr_reader :id, :name, :genres, :popularity, :uri, :href, :external_url, :followers_total, :images

    def initialize(data)
      @id = data["id"]
      @name = data["name"]
      @genres = data["genres"]
      @popularity = data["popularity"]
      @uri = data["uri"]
      @href = data["href"]
      @external_url = data.dig("external_urls", "spotify")
      @followers_total = data.dig("followers", "total")
      @images = data["images"].map { |img| SpotifyApiImage.new(img) } if data["images"]
    end
  end
end
