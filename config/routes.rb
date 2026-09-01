Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root to: "imports#index"

  post "imports/import", to: "imports#import", as: :import_import

  resources :imports do
    member do
      get :status
    end

    resource :summary, only: [ :show ]

    resource :search, only: [] do
      get :entity_names
    end

    resource :replay, only: [] do
      get :bootstrap
      get :entity_series
      get :range_summary
      get :day
    end
  end

  # ✅ Spotify image endpoints for lazy loading
  get "spotify/artist_image", to: "spotify#artist_image"
  get "spotify/track_image", to: "spotify#track_image"
end
