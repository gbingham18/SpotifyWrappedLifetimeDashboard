source "https://rubygems.org"
ruby "3.4.2"
# Used for Zip file processing
gem "rubyzip"
# A utility class for managing temporary files.
gem "tempfile"
# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem "rails", "~> 8.0.1"
# The modern asset pipeline for Rails [https://github.com/rails/propshaft]
gem "propshaft"
# Use the Puma web server [https://github.com/puma/puma]
gem "puma", ">= 5.0"
# Use JavaScript with ESM import maps [https://github.com/rails/importmap-rails]
gem "importmap-rails"
# Hotwire's SPA-like page accelerator [https://turbo.hotwired.dev]
gem "turbo-rails"
# Hotwire's modest JavaScript framework [https://stimulus.hotwired.dev]
gem "stimulus-rails"
# Build JSON APIs with ease [https://github.com/rails/jbuilder]
gem "jbuilder"
#
gem "sass-rails", "~> 5.0"

# Use Active Model has_secure_password [https://guides.rubyonrails.org/active_model_basics.html#securepassword]
# gem "bcrypt", "~> 3.1.7"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Use the database-backed adapters for Rails.cache, Active Job, and Action Cable
gem "solid_cache"
gem "solid_queue"
gem "solid_cable"

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", require: false

# Bootstrap: Front-end framework for building responsive, mobile-first websites.
# Provides a collection of pre-designed components, grid system, and JavaScript plugins.
# For more details, visit: https://getbootstrap.com/
# gem "bootstrap", "~> 5.0.0"

# Deploy this application anywhere as a Docker container [https://kamal-deploy.org]
gem "kamal", require: false

# Add HTTP asset caching/compression and X-Sendfile acceleration to Puma [https://github.com/basecamp/thruster/]
gem "thruster", require: false

# Use Active Storage variants [https://guides.rubyonrails.org/active_storage_overview.html#transforming-images]
gem "image_processing", "~> 1.2"

gem "sidekiq"

# Use PostgreSQL for production
gem "pg", "~> 1.5"

gem "vips"               # or libvips / ruby-vips
gem "redis"              # if you're using Redis-backed stores
gem "dalli"              # for MemCacheStore
# gem "webrobots"                   # if using `robots.txt` parsing

group :development, :test do
  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"

  # Static analysis for security vulnerabilities [https://brakemanscanner.org/]
  gem "brakeman", require: false

  # Omakase Ruby styling [https://github.com/rails/rubocop-rails-omakase/]
  gem "rubocop-rails-omakase", require: false

  # These are for the debugger
  gem "ruby-debug-ide", "~> 0.7.5"
  gem "debase", "~> 0.2.9"
  # End debugger gems

  # Loads environment variables from .env for local development and testing
  # Do not use in production — rely on real ENV vars instead
  gem "dotenv-rails"

  # Primary language server
  gem "ruby-lsp"

  # Optional: Static typing (for types)
  gem "sorbet"
  gem "sorbet-runtime"
  # Sorbet requires these to analyze things
  gem "listen"                       # used in dev by file watchers
  gem "sprockets-rails"            # for asset pipeline compatibility
  gem "selenium-webdriver"
  gem "ruby_parser"        # required by prism
  gem "html_truncator"     # used in some ActionView helpers

  # Optional: For docs
  gem "yard"

  # Optional: Schema info in models
  # gem "annotate"
end

group :development do
  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem "web-console"
end

group :test do
  # Use system testing [https://guides.rubyonrails.org/testing.html#system-testing]
  gem "capybara"
end
