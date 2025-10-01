Rails.application.routes.draw do
  root to: "imports#index"

  post "imports/import", to: "imports#import", as: :import_import

  resources :imports do
    member do
      get :status   # ✅ Add this line to enable `/imports/:id/status`
    end

    resource :summary, only: [ :show ] do
      get :bar_chart_race
    end
  end

  # ✅ Spotify image endpoints for lazy loading
  get "spotify/artist_image", to: "spotify#artist_image"
  get "spotify/track_image", to: "spotify#track_image"
end
