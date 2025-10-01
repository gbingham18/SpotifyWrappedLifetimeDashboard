module SpotifyApi
  class SpotifyApiTrack
    attr_reader :id, :name, :artists, :album, :duration_ms, :explicit,
                :external_urls, :popularity, :preview_url, :track_number,
                :uri, :href, :disc_number, :available_markets, :is_playable,
                :is_local, :external_ids, :restrictions

    def initialize(data)
      @id = data["id"]
      @name = data["name"]
      @duration_ms = data["duration_ms"]
      @explicit = data["explicit"]
      @external_urls = data.dig("external_urls", "spotify")
      @popularity = data["popularity"]
      @preview_url = data["preview_url"]
      @track_number = data["track_number"]
      @uri = data["uri"]
      @href = data["href"]
      @disc_number = data["disc_number"]
      @available_markets = data["available_markets"]
      @is_playable = data["is_playable"]
      @is_local = data["is_local"]
      @external_ids = data["external_ids"]
      @restrictions = data["restrictions"]

      @artists = data["artists"].map { |a| SpotifyApiArtist.new(a) }
      @album = SpotifyApiAlbum.new(data["album"]) if data["album"]
    end
  end
end
