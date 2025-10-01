module SpotifyApi
  class SpotifyApiAlbum
    attr_reader :id, :name, :album_type, :release_date, :release_date_precision,
                :total_tracks, :available_markets, :external_urls, :uri,
                :href, :images, :restrictions, :artists

    def initialize(data)
      @id = data["id"]
      @name = data["name"]
      @album_type = data["album_type"]
      @release_date = data["release_date"]
      @release_date_precision = data["release_date_precision"]
      @total_tracks = data["total_tracks"]
      @available_markets = data["available_markets"]
      @external_urls = data.dig("external_urls", "spotify")
      @uri = data["uri"]
      @href = data["href"]
      @restrictions = data["restrictions"]

      @images = data["images"]&.map { |img| SpotifyApiImage.new(img) } || []
      @artists = data["artists"]&.map { |artist| SpotifyApiArtist.new(artist) } || []
    end
  end
end
