package com.makecommand.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.*
import android.widget.RemoteViews
import kotlinx.coroutines.*
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

class TaskWidget : AppWidgetProvider() {

    private val supabaseUrl = "https://uawglncthemjdtzrkwbn.supabase.co"
    private val supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2dsbmN0aGVtamR0enJrd2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjcxNzUsImV4cCI6MjA2NzY0MzE3NX0.HoDEAe3Ryic4s9ndhg50_wt7qb7VW8wsoVqRzvBvN4g"

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (appWidgetId in ids) {
            updateWidget(context, manager, appWidgetId)
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.task_widget)

        CoroutineScope(Dispatchers.IO).launch {
            val task = fetchLatestTask()
            if (task != null) {
                val taskId = task.first
                val taskTitle = task.second

                views.setTextViewText(R.id.task_title, "📝 $taskTitle")

                val intent = Intent(context, TaskWidget::class.java).apply {
                    action = "MARK_DONE"
                    putExtra("task_id", taskId)
                }

                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.mark_done_button, pendingIntent)
            } else {
                views.setTextViewText(R.id.task_title, "❌ No pending tasks")
            }

            withContext(Dispatchers.Main) {
                manager.updateAppWidget(widgetId, views)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == "MARK_DONE") {
            val taskId = intent.getStringExtra("task_id")
            if (!taskId.isNullOrEmpty()) {
                CoroutineScope(Dispatchers.IO).launch {
                    markTaskDone(taskId)
                }
            }
        }
    }

    private fun fetchLatestTask(): Pair<String, String>? {
        return try {
            val url = "$supabaseUrl/rest/v1/tasks?select=id,title,status&status=eq.pending&order=created_at.desc&limit=1"
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.setRequestProperty("apikey", supabaseKey)
            conn.setRequestProperty("Authorization", "Bearer $supabaseKey")
            conn.requestMethod = "GET"
            conn.connect()

            val response = conn.inputStream.bufferedReader().readText()
            val json = JSONArray(response)
            if (json.length() > 0) {
                val obj = json.getJSONObject(0)
                val id = obj.getString("id")
                val title = obj.getString("title")
                id to title
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun markTaskDone(taskId: String) {
        try {
            val url = "$supabaseUrl/rest/v1/tasks?id=eq.$taskId"
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.setRequestProperty("apikey", supabaseKey)
            conn.setRequestProperty("Authorization", "Bearer $supabaseKey")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.requestMethod = "PATCH"
            conn.doOutput = true

            val body = """{"status": "completed"}"""
            conn.outputStream.write(body.toByteArray())
            conn.inputStream.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
