# typed: true
require 'net/http'
require 'uri'
require 'base64'
require 'json'

module SpotifyToken
  def self.fetch
    client_id = ENV['SPOTIFY_CLIENT_ID']
    client_secret = ENV['SPOTIFY_CLIENT_SECRET']

    uri = URI('https://accounts.spotify.com/api/token')
    request = Net::HTTP::Post.new(uri)
    request.set_form_data('grant_type' => 'client_credentials')
    auth = Base64.strict_encode64("#{client_id}:#{client_secret}")
    request['Authorization'] = "Basic #{auth}"

    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
      http.request(request)
    end

    JSON.parse(response.body)['access_token']
  end
end
