package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
)

type chatRow struct {
	ChatJID                 string
	LastMsgTs               time.Time
	Archived                bool
	LidPN                   string
	PnLID                   string
	GroupName               string
	DirectFirstName         string
	DirectFullName          string
	DirectBusinessName      string
	LidResolvedFirstName    string
	LidResolvedFullName     string
	LidResolvedBusinessName string
	PnResolvedFirstName     string
	PnResolvedFullName      string
	PnResolvedBusinessName  string
}

func GetChats(ctx context.Context, db *sql.DB, client *whatsmeow.Client, ourJID string) ([]ChatEntry, error) {
	rows, err := getChatsQuery(ctx, db, ourJID)
	if err != nil {
		return nil, err
	}

	resolveMissingLIDMappings(ctx, client, rows)

	entries := make([]ChatEntry, 0, len(rows))
	for _, cr := range rows {
		isGroup := false
		if jid, err := types.ParseJID(cr.ChatJID); err == nil {
			isGroup = jid.Server == types.GroupServer
		}
		entries = append(entries, ChatEntry{
			ID:            cr.ChatJID,
			IsArchived:    cr.Archived,
			IsGroup:       isGroup,
			LastMessageTs: cr.LastMsgTs.UTC().Format(time.RFC3339),
			Name:          getChatName(ctx, client, cr),
		})
	}
	return entries, nil
}

// resolveMissingLIDMappings forces whatsmeow to populate LID→PN mappings for chats
// that have no contact assigned and no existing mapping. Without this, chats from
// users who are only known by their LID (e.g. from group messages where the
// sender_pn attribute was absent) show a raw LID string instead of a phone number.
// GetUserInfo triggers a usync query to WhatsApp, storing the mapping in
// whatsmeow_lid_map and any verified business name in whatsmeow_contacts.
func resolveMissingLIDMappings(ctx context.Context, client *whatsmeow.Client, rows []chatRow) {
	var unresolved []types.JID
	for _, cr := range rows {
		jid, err := types.ParseJID(cr.ChatJID)
		if err != nil || jid.Server == types.GroupServer {
			continue
		}
		if pickName(cr.DirectFullName, cr.DirectFirstName, cr.DirectBusinessName) != "" ||
			pickName(cr.LidResolvedFullName, cr.LidResolvedFirstName, cr.LidResolvedBusinessName) != "" ||
			pickName(cr.PnResolvedFullName, cr.PnResolvedFirstName, cr.PnResolvedBusinessName) != "" {
			continue
		}
		if (jid.Server == types.HiddenUserServer || jid.Server == types.HostedLIDServer) && cr.LidPN == "" {
			unresolved = append(unresolved, jid)
		}
	}
	if len(unresolved) > 0 {
		client.GetUserInfo(ctx, unresolved)
	}
}

func getChatsQuery(ctx context.Context, db *sql.DB, ourJID string) ([]chatRow, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT
			m.chat_jid,
			MAX(m.ts) AS last_msg_ts,
			COALESCE(bool_or(COALESCE(cs.archived, cs_via_lid.archived, cs_via_pn.archived)), FALSE) AS archived,
			COALESCE(MAX(lm.pn || '@s.whatsapp.net'), '') AS lid_pn,
			COALESCE(MAX(lm2.lid || '@lid'), '') AS pn_lid,
			COALESCE(MAX(g.group_name), '') AS group_name,
			COALESCE(MAX(co_direct.first_name), '') AS direct_first_name,
			COALESCE(MAX(co_direct.full_name), '') AS direct_full_name,
			COALESCE(MAX(co_direct.business_name), '') AS direct_business_name,
			COALESCE(MAX(co_via_lid.first_name), '') AS lid_first_name,
			COALESCE(MAX(co_via_lid.full_name), '') AS lid_full_name,
			COALESCE(MAX(co_via_lid.business_name), '') AS lid_business_name,
			COALESCE(MAX(co_via_pn.first_name), '') AS pn_first_name,
			COALESCE(MAX(co_via_pn.full_name), '') AS pn_full_name,
			COALESCE(MAX(co_via_pn.business_name), '') AS pn_business_name
		FROM whatsmeow_messages m
		LEFT JOIN whatsmeow_lid_map lm ON lm.lid = replace(m.chat_jid, '@lid', '')
		LEFT JOIN whatsmeow_lid_map lm2 ON lm2.pn = replace(m.chat_jid, '@s.whatsapp.net', '')
		LEFT JOIN whatsmeow_chat_settings cs ON cs.chat_jid = m.chat_jid AND cs.our_jid = $1
		LEFT JOIN whatsmeow_chat_settings cs_via_lid ON cs_via_lid.chat_jid = lm.pn || '@s.whatsapp.net' AND cs_via_lid.our_jid = $1
		LEFT JOIN whatsmeow_chat_settings cs_via_pn ON cs_via_pn.chat_jid = lm2.lid || '@lid' AND cs_via_pn.our_jid = $1
		LEFT JOIN whatsmeow_groups g ON g.group_jid = m.chat_jid AND g.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_direct ON co_direct.their_jid = m.chat_jid AND co_direct.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_via_lid ON co_via_lid.their_jid = lm.pn || '@s.whatsapp.net' AND co_via_lid.our_jid = $1
		LEFT JOIN whatsmeow_contacts co_via_pn ON co_via_pn.their_jid = lm2.lid || '@lid' AND co_via_pn.our_jid = $1
		WHERE m.our_jid = $1
		GROUP BY m.chat_jid
		ORDER BY MAX(m.ts) DESC`, ourJID)
	if err != nil {
		return nil, fmt.Errorf("query chats: %w", err)
	}
	defer rows.Close()

	var chatRows []chatRow
	for rows.Next() {
		var cr chatRow
		if err := rows.Scan(
			&cr.ChatJID, &cr.LastMsgTs, &cr.Archived, &cr.LidPN, &cr.PnLID,
			&cr.GroupName,
			&cr.DirectFirstName, &cr.DirectFullName, &cr.DirectBusinessName,
			&cr.LidResolvedFirstName, &cr.LidResolvedFullName, &cr.LidResolvedBusinessName,
			&cr.PnResolvedFirstName, &cr.PnResolvedFullName, &cr.PnResolvedBusinessName,
		); err != nil {
			return nil, fmt.Errorf("scan chat: %w", err)
		}
		chatRows = append(chatRows, cr)
	}
	return chatRows, rows.Err()
}

func getChatName(ctx context.Context, client *whatsmeow.Client, cr chatRow) string {
	jid, err := types.ParseJID(cr.ChatJID)
	if err != nil {
		return cr.ChatJID
	}

	if jid.Server == types.GroupServer {
		if cr.GroupName != "" {
			return cr.GroupName
		}
		return jid.String()
	}

	if name := pickName(cr.DirectFullName, cr.DirectFirstName, cr.DirectBusinessName); name != "" {
		return name
	}

	isLID := jid.Server == types.HiddenUserServer || jid.Server == types.HostedLIDServer
	isPN := jid.Server == types.DefaultUserServer

	if isLID {
		pnJIDStr := cr.LidPN
		if pnJIDStr == "" {
			pnJIDStr = resolveLIDToPN(ctx, client, jid)
		}
		if pnJIDStr == "" {
			return jid.String()
		}
		if name := pickName(cr.LidResolvedFullName, cr.LidResolvedFirstName, cr.LidResolvedBusinessName); name != "" {
			return name
		}
		pnJID, err := types.ParseJID(pnJIDStr)
		if err != nil {
			return pnJIDStr
		}
		if name := contactName(ctx, client, pnJID); name != "" {
			return name
		}
		return formatPhoneNumber(pnJID.User)
	} else if isPN {
		if name := pickName(cr.PnResolvedFullName, cr.PnResolvedFirstName, cr.PnResolvedBusinessName); name != "" {
			return name
		}
		if cr.PnLID != "" {
			if lidJID, err := types.ParseJID(cr.PnLID); err == nil {
				if name := contactName(ctx, client, lidJID); name != "" {
					return name
				}
			}
		}
		return formatPhoneNumber(jid.User)
	}
	return jid.String()
}

func resolveLIDToPN(ctx context.Context, client *whatsmeow.Client, lidJID types.JID) string {
	if client == nil || client.Store == nil || client.Store.LIDs == nil {
		return ""
	}
	pnJID, err := client.Store.LIDs.GetPNForLID(ctx, lidJID)
	if err != nil || pnJID.IsEmpty() {
		return ""
	}
	return pnJID.String()
}

func contactName(ctx context.Context, client *whatsmeow.Client, jid types.JID) string {
	if client == nil || client.Store == nil || client.Store.Contacts == nil {
		return ""
	}
	contact, err := client.Store.Contacts.GetContact(ctx, jid)
	if err != nil || !contact.Found {
		return ""
	}
	return pickName(contact.FullName, contact.FirstName, contact.BusinessName)
}

func pickName(fullName, firstName, businessName string) string {
	if fullName != "" {
		return fullName
	}
	if firstName != "" {
		return firstName
	}
	if businessName != "" {
		return businessName
	}
	return ""
}

func formatPhoneNumber(raw string) string {
	if raw == "" {
		return ""
	}
	if raw[0] == '+' {
		return raw
	}

	if strings.HasPrefix(raw, "41") && len(raw) == 11 {
		national := raw[2:]
		return fmt.Sprintf("+41 %s %s %s %s", national[0:2], national[2:5], national[5:7], national[7:9])
	}

	if len(raw) >= 3 {
		return fmt.Sprintf("+%s %s", raw[0:2], raw[2:])
	}
	return "+" + raw
}
