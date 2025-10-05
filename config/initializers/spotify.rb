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

    http = Net::HTTP.new(uri.hostname, uri.port)
    http.use_ssl = true
    http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?

    http.start
    response = http.request(request)
    http.finish

    JSON.parse(response.body)['access_token']
  end
end
