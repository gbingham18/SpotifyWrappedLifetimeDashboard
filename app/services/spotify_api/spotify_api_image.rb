module SpotifyApi
  class SpotifyApiImage
    attr_reader :url, :height, :width

    def initialize(data)
      @url = data["url"]
      @height = data["height"]
      @width = data["width"]
    end
  end
end
