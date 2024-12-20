
// Proxy represents the related Proxy entity.
type Proxy struct {
	id               int
	host             string
	port             int
	proxy_username   string
	proxy_password   string
}

// SnapchatAccount represents the SnapchatAccount model in Go.
type SnapchatAccount struct {
	id               int                `json:"id"`
	username         string             `json:"username"`
	password         string             `json:"password"`
	snapchat_link    string             `json:"snapchat_link"`
	two_fa_secret    string             `json:"two_fa_secret"`
	status           string  			`json:"status"`
	proxy            *Proxy             `json:"proxy"` 
	tag              string             `json:"tag"`
}