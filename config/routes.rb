Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root to: "imports#index"

  resources :imports, only: [ :index, :create ] do
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
end
